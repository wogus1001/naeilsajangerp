export type LoginUser = {
    readonly id?: string;
    readonly uid?: string;
    readonly name?: string;
    readonly role?: string;
    readonly companyName?: string;
    readonly companyId?: string | null;
    readonly companyLogoUrl?: string;
    readonly email?: string | null;
    readonly phone?: string | null;
    readonly status?: string;
};

export type LoginApiResponse = {
    readonly user?: LoginUser;
    readonly session?: {
        readonly access_token?: string;
        readonly refresh_token?: string;
    };
    readonly error?: string;
};
