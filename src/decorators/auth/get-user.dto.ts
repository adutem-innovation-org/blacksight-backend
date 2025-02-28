/**
 * only returns fields that equates to zero
 */
export class GetUserDto {
  gender = 1;
  firstName = 1;
  lastName = 1;
}

/**
 * ignores the fields that equates to zero
 */
export const GetUserAltDto = {
  hash: 0,
  salt: 0,
  bvn: 0,
};

/**
 * pick only the fields that equates to one
 */
export const GetUserPasswordDto = {
  hash: 1,
  salt: 1,
};
