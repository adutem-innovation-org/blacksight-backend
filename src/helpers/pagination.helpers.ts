import { Model } from "mongoose";

interface AggregatePaginateOptions {
  page?: number;
  limit?: number;
  match?: Record<string, any>;
  project?: Record<string, number | 0>;
  sort?: Record<string, 1 | -1>;
  lookups?: Record<
    string,
    { from: string; localField: string; foreignField: string }
  >;
}

interface AggregatePaginateResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    prev: boolean;
    next: boolean;
  };
  status: "success" | "error";
}

export async function aggregatePaginate<T>(
  model: Model<T>,
  options: AggregatePaginateOptions
): Promise<AggregatePaginateResult<T>> {
  const {
    page = 1,
    limit = 20,
    match = {},
    project = {},
    sort = { createdAt: -1 },
    lookups = {},
  } = options;

  const skip = (page - 1) * limit;

  const lookupStages = Object.entries(lookups).flatMap(([alias, config]) => [
    {
      $lookup: {
        from: config.from,
        localField: config.localField,
        foreignField: config.foreignField,
        as: alias,
      },
    },
    {
      $addFields: {
        [`total${capitalize(alias)}`]: { $size: `$${alias}` },
      },
    },
  ]);

  const aggregation = [
    { $match: match },
    ...lookupStages,
    {
      $project: {
        ...project,
        // Explicit exclusion ==> This code was commented out because exclusion is handle automatically by mongoose, and it doesn't support exclusion on lookup fields in inclusion projection
        // ...Object.keys(lookups).reduce((acc, alias) => {
        //   acc[alias] = 0;
        //   return acc;
        // }, {} as Record<string, 0>),
      },
    },
    {
      $facet: {
        data: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
    {
      $addFields: {
        meta: {
          $let: {
            vars: {
              total: { $arrayElemAt: ["$meta.total", 0] },
            },
            in: {
              total: "$$total",
              page,
              limit,
              pages: { $ceil: { $divide: ["$$total", limit] } },
              prev: { $gt: [page, 1] },
              next: {
                $and: [
                  { $gt: ["$$total", 0] },
                  { $lt: [page, { $ceil: { $divide: ["$$total", limit] } }] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        data: 1,
        meta: 1,
      },
    },
  ];

  try {
    const result = await model.aggregate(aggregation).exec();
    const { data = [], meta } = result[0] || {};
    return {
      data,
      meta: {
        page,
        limit,
        total: meta?.total || 0,
        pages: meta?.pages || 0,
        prev: meta?.prev || false,
        next: meta?.next || false,
      },
      status: "success",
    };
  } catch (error) {
    return {
      data: [],
      meta: { page, limit, total: 0, pages: 0, prev: false, next: false },
      status: "error",
    };
  }
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
