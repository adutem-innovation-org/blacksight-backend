import { StatusCodes } from "http-status-codes";
import { CustomErrorInterface } from "./interfaces/Error";
import CustomError from "./CustomError";

export default class UnsupportedMediaType
  extends CustomError
  implements CustomErrorInterface
{
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.UNSUPPORTED_MEDIA_TYPE;
  }
}

export const createUnsupportedMediaType = (message: string) =>
  new UnsupportedMediaType(message);
