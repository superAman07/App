import { User } from '@prisma/client'; // Adjust the import to your model if needed

declare global {
  namespace Express {
    interface Request {
      user?: User; // Add the 'user' property here, and you can specify its type
    }
  }
}
