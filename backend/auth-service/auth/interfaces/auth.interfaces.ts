// Interface de base pour l'utilisateur
export interface UserResponse {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    mfaEnabled: boolean;
}

// Interface pour les liens HATEOAS
export interface HateoasLinks {
    [key: string]: { href: string };
}

// Interface de base pour toutes les réponses
export interface BaseResponse {
    _links: HateoasLinks;
}

// Interface pour la réponse MFA requise
export interface MfaRequiredResponse extends BaseResponse {
    mfaRequired: true;
    userId: string;
}

// Interface pour la réponse de connexion réussie
export interface LoginSuccessResponse extends BaseResponse {
    mfaRequired: false;
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
}

// Type union pour la réponse de login
export type LoginResponse = MfaRequiredResponse | LoginSuccessResponse;

// Interface pour les tokens
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

// Interface pour la réponse MFA setup
export interface MfaSetupResponse extends BaseResponse {
    secret: string;
    qrCodeUrl: string;
}

// Interface pour la réponse d'enregistrement
export interface RegisterResponse extends BaseResponse {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
}