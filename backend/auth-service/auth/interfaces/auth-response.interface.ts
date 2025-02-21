export interface AuthResponse {
    data: {
        accessToken?: string;
        refreshToken?: string;
        mfaRequired?: boolean;
        user?: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    };
    _links: {
        [key: string]: {
            href: string
        }
    }
}