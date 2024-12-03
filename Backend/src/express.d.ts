// express.d.ts (this is where you'll augment the Request interface)
import { IUser } from './user.interface';  // Import the IUser interface

declare global {
  namespace Express {
    interface Request {
      user?: IUser;   
    }
  }
}
