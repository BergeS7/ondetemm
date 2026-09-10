// Bounded signals keep paid weight from being the sole ranking criterion.
export class RankingService {
  static expression = `(c.ranking_weight + c.average_rating*2 + least(ln(1+c.popularity),5)*2 + c.completeness*5 + case when c.verified then 3 else 0 end + case when c.updated_at>now()-interval '30 days' then 2 else 0 end)`;
  static order(sort: string) {
    return (
      {
        rating: 'c.average_rating desc,c.reviews_count desc,c.id',
        name: 'c.name,c.id',
        recent: 'c.created_at desc,c.id',
        relevance: 'relevance desc,ranking_score desc,c.id',
      }[sort] ?? 'relevance desc,ranking_score desc,c.id'
    );
  }
}
