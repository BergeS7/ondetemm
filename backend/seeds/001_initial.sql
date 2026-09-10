insert into public.countries(code,name) values('BR','Brasil') on conflict(code) do nothing;
insert into public.states(country_id,name,code) select id,'Maranhão','MA' from public.countries where code='BR' on conflict(code) do nothing;
insert into public.cities(state_id,name,slug,ibge_code)
 select s.id,v.name,v.slug,v.ibge from public.states s cross join (values
 ('Santa Inês','santa-ines','2109908'),('São Luís','sao-luis','2111300'),('Imperatriz','imperatriz','2105302'),
 ('Bacabal','bacabal','2101202'),('Pindaré-Mirim','pindare-mirim','2108504'),('Santa Luzia','santa-luzia','2110005')) v(name,slug,ibge)
 where s.code='MA' on conflict(state_id,slug) do nothing;
insert into public.categories(name,slug) values
 ('Churrascarias','churrascarias'),('Restaurantes','restaurantes'),('Pizzarias','pizzarias'),('Lanchonetes','lanchonetes'),
 ('Barbearias','barbearias'),('Salões','saloes'),('Clínicas','clinicas'),('Dentistas','dentistas'),('Farmácias','farmacias'),
 ('Academias','academias'),('Oficinas','oficinas'),('Autopeças','autopecas'),('Tecnologia','tecnologia'),
 ('Assistência Técnica','assistencia-tecnica'),('Supermercados','supermercados'),('Construção','construcao'),
 ('Educação','educacao'),('Imóveis','imoveis'),('Hotéis','hoteis'),('Serviços profissionais','servicos-profissionais')
 on conflict(slug) do nothing;
insert into public.plans(code,name,description,price_monthly,limits,ranking_weight) values
 ('FREE','Gratuito','Perfil essencial',0,'{"categories":1,"photos":3,"services":0,"promotions":0,"analytics_days":0,"home_featured":false}',0),
 ('FEATURED','Destaque','Visibilidade e métricas básicas',29.90,'{"categories":3,"photos":10,"services":15,"promotions":3,"analytics_days":30,"home_featured":false}',10),
 ('PREMIUM','Premium','Mais recursos e histórico',59.90,'{"categories":8,"photos":30,"services":50,"promotions":10,"analytics_days":90,"home_featured":true}',20)
 on conflict(code) do nothing;
