import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import type { Actor, Database } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import { UploadRepository } from './uploads.repository.js';
import { AppError, ValidationError } from '../../shared/errors/index.js';
import type { Config } from '../../config/env.js';
import { supabaseClients } from '../../config/supabase.js';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export interface ImageStorage {
  put(path: string, buffer: Buffer): Promise<void>;
  remove(path: string): Promise<void>;
  sign(path: string): Promise<string>;
}
export class SupabaseImageStorage implements ImageStorage {
  private client;
  constructor(config: Config) {
    this.client = supabaseClients(config).admin;
  }
  async put(path: string, buffer: Buffer) {
    const { error } = await this.client.storage
      .from('company-images')
      .upload(path, buffer, { contentType: 'image/webp', upsert: false });
    if (error) throw new AppError(502, 'STORAGE_ERROR', 'Falha ao armazenar imagem');
  }
  async remove(path: string) {
    const { error } = await this.client.storage.from('company-images').remove([path]);
    if (error) throw new AppError(502, 'STORAGE_ERROR', 'Falha ao remover imagem');
  }
  async sign(path: string) {
    const { data, error } = await this.client.storage
      .from('company-images')
      .createSignedUrl(path, 60);
    if (error || !data) throw new AppError(502, 'STORAGE_ERROR', 'Imagem indisponível');
    return data.signedUrl;
  }
}
export class UploadService {
  constructor(
    private db: Database,
    private companies: CompanyService,
    private storage: ImageStorage,
    private repo = new UploadRepository(),
  ) {}
  async upload(
    actor: Actor,
    companyId: string,
    file: Express.Multer.File | undefined,
    type: string,
    sortOrder: number,
  ) {
    await this.companies.access(actor, companyId);
    if (!file || file.size > MAX_UPLOAD_BYTES)
      throw new ValidationError('Envie uma imagem de até 5 MB');
    const detected = await fileTypeFromBuffer(file.buffer);
    if (
      !detected ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(detected.mime) ||
      file.mimetype !== detected.mime
    )
      throw new ValidationError('Formato de imagem inválido');
    let buffer: Buffer;
    try {
      buffer = await sharp(file.buffer, { limitInputPixels: 20000000, animated: false })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new ValidationError('Imagem corrompida ou dimensões excessivas');
    }
    const imageId = randomUUID(),
      path = `${companyId}/${imageId}.webp`;
    await this.storage.put(path, buffer);
    try {
      return await this.db.run('system', async (sql) => {
        const c = await this.repo.company(sql, companyId);
        if (actor.role !== 'ADMIN' && c.owner_id !== actor.id)
          throw new ValidationError('Proprietário alterado');
        return this.repo.create(sql, imageId, companyId, path, type, sortOrder);
      });
    } catch (error) {
      try {
        await this.storage.remove(path);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Falha de upload e compensação; imagem ${imageId}`,
        );
      }
      throw error;
    }
  }
  async signed(id: string, actor?: Actor) {
    const image = await this.db.run(actor, (s) => this.repo.get(s, id));
    return this.storage.sign(String(image.storage_path));
  }
  async remove(actor: Actor, id: string) {
    const image = await this.db.run('system', (s) => this.repo.get(s, id));
    await this.companies.access(actor, String(image.company_id));
    // Remove storage first; a failed external call leaves metadata for a safe retry.
    await this.storage.remove(String(image.storage_path));
    await this.db.run('system', (s) => this.repo.remove(s, id, image.company_id, image.url));
    return { success: true };
  }
}
