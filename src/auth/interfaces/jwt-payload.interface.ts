export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  /** Lo añade jwtService.sign (segundos) */
  iat?: number;
}
