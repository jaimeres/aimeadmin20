export interface LoggedUser {
  id?: number;
  username: string;
  name: string;
  last_name?: string;
  email?: string;
  user_type?: string;
  default_user_type?: string;
  gender?: string;
  is_voidable?: boolean;
  is_active?: boolean;
  image?: string;
  erp?: any;
}
