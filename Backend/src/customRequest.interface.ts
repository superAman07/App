import { Request } from 'express';

// Define the IUser interface that will be used in the token payload
export interface IUser {
  userId: number;  // Change 'id' to 'userId' to match the token
  name?: string;    // Optional because it might not be in the token
  email?: string;   // Optional because it might not be in the token
  role: string;
  mobileNumber?: string;
}

// Define the CustomRequest interface which extends Express' Request
export interface CustomRequest extends Request {
  user?: IUser;  // Attach IUser data to the request object
}
