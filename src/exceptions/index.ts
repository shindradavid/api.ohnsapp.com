export class HttpException extends Error {
  public status: number;
  public message: string;

  constructor(status: number, message: string) {
    super(message);

    // Restore prototype chain
    Object.setPrototypeOf(this, HttpException.prototype);

    this.status = status;
    this.message = message;
  }
}
