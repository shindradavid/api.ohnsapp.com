type User = import('./entities/User').User;
type Session = import('./entities/Session').Session;

declare namespace Express {
  interface Request {
    user?: User;
    session?: Session;
    file?: Multer.File;
    files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
  }

  namespace Multer {
    interface File {
      /** Field name specified in the form */
      fieldname: string;
      /** Name of the file on the user's computer */
      originalname: string;
      /** Encoding type of the file */
      encoding: string;
      /** Mime type of the file */
      mimetype: string;
      /** Size of the file in bytes */
      size: number;
      /** A Buffer of the entire file (if in-memory storage is used) */
      buffer: Buffer;
    }
  }
}
