// user.interface.ts (you can place it in a separate file or directly in your code)
interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;  // Add all the properties that are required by your application
  mobileNumber?: string;
}

interface CustomRequest extends Request {
  user?: IUser;
}