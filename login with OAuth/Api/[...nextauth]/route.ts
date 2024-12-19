import { prismaClient } from "@/app/lib/db";
import NextAuth from "next-auth"; 
import GitHubProvider from "next-auth/providers/github";
const handler = NextAuth({
    providers:[
        GitHubProvider({
            clientId:process.env.GITHUB_CLIENT_ID??"",
            clientSecret:process.env.GITHUB_CLIENT_SECRET ??""
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET ?? "secret",
    callbacks:{
        async signIn(params){
            if(!params.user.email){
                return false;
            }
            try{
                const existingUser = await prismaClient.user.findUnique({
                    where: { email: params.user.email },
                  });
                  if (!existingUser) {
                    await prismaClient.user.create({
                      data: {
                        email: params.user.email,
                        provider: "GitHub",
                      },
                    });
                  }
            }catch(e){
                console.error(e);
                return false;
            }
            return true;
        }
    }
});

export {handler as GET, handler as POST};
