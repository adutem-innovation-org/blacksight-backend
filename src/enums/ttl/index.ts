/*
 * @file TTL
 * @description Time to live for cache and session (seconds)
 */

export enum TTL {
  IN_A_MINUTE = 60,
  IN_5_MINUTES = 5 * 60,
  IN_10_MINUTES = 10 * 60,
  IN_15_MINUTES = 15 * 60,
  IN_30_MINUTES = 30 * 60,
  IN_AN_HOUR = 60 * 60,
  IN_2_HOURS = 2 * 60 * 60,
  IN_3_HOURS = 3 * 60 * 60,
  IN_24_HOURS = 24 * 60 * 60,
}
