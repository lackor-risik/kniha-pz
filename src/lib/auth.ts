import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            image?: string;
            role: 'ADMIN' | 'MEMBER';
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'ADMIN' | 'MEMBER';
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email || account?.provider !== 'google') {
                return false;
            }

            // Find member by email (case-insensitive)
            const member = await prisma.member.findFirst({
                where: {
                    email: {
                        equals: user.email,
                        mode: 'insensitive',
                    },
                },
            });

            // Member must exist and be active
            if (!member || !member.isActive) {
                return '/unauthorized';
            }

            // First login - assign google_sub
            if (!member.googleSub && account?.providerAccountId) {
                await prisma.member.update({
                    where: { id: member.id },
                    data: {
                        googleSub: account.providerAccountId,
                        avatarUrl: user.image || member.avatarUrl,
                    },
                });
            }

            return true;
        },

        async jwt({ token, account, user }) {
            if (account && user?.email) {
                // Find member to get their ID and role
                const member = await prisma.member.findFirst({
                    where: {
                        email: {
                            equals: user.email,
                            mode: 'insensitive',
                        },
                    },
                });

                if (member) {
                    token.id = member.id;
                    token.role = member.role;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }

            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
