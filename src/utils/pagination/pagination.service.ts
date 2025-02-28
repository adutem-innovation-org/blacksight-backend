import { Model } from "mongoose";
import { Pagination, PaginationOptions } from "./pagination.entity";

export default class PaginationService<T> {
  constructor(model: Model<T>) {
    this.model = model;
  }
  model: Model<T>;

  /**
   * parse query
   * @param  {string} parameters
   * @return {object}
   */
  static extractQuery = (parameters: object, fields: string[] = []) => {
    if (parameters == null) return null;

    const query: Record<string, unknown> = {};
    for (const element in parameters) {
      type Element = keyof typeof parameters;
      if (fields.includes(element)) {
        const val: any = parameters[element as Element];

        query[element] = val;
      }
    }
    return query;
  };

  /**
   *
   * @param {PaginationOptions}  options
   * @param {string[]}  keys - keys to extract from request query parameter
   */
  async paginate<T>(
    options: PaginationOptions,
    keys: string[]
  ): Promise<Pagination<T>> {
    const {
      page,
      limit,
      q,
      projections,
      sort,
      // query,
      populate,
    } = options;
    const query: Record<string, unknown> = {
      ...options.query,
      ...PaginationService.extractQuery(options, keys),
    };

    if (q) {
      query["$text"] = { $search: q };
    }

    // console.log(query);

    const p = Number(page) || 1;
    const pp = Number(limit) || 20;

    const result = await Promise.allSettled([
      this.model.countDocuments(query),
      this.model
        .find(query, projections)
        .skip(pp * (p - 1))
        .limit(pp)
        .sort(sort)
        .populate(populate)
        .lean()
        .exec(),
    ]);

    let status = "success";
    if (result[0].status == "rejected" || result[1].status == "rejected")
      status = "error";

    const first =
      result[0].status === "fulfilled"
        ? result[0]
        : ({ value: 0 } as PromiseFulfilledResult<number>);
    const second =
      result[1].status === "fulfilled"
        ? result[1]
        : ({ value: [] } as PromiseFulfilledResult<any>);

    const total = first.value || 0;
    const pages = Math.ceil(total / pp);
    // console.log(result[1])

    return {
      data: second ? second.value || [] : [],
      meta: {
        pages,
        prev: p > 1,
        next: p < pages && pages > 0,
        total,
        page: p,
        // sort: ,
        limit: pp,
      },
      status,
    };
  }
}

export { PaginationService };
