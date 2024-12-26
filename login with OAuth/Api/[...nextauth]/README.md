here we have to do in front-end for logout/signout...as shown below....

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() =>
        signOut({
          callbackUrl: "/", // Optional: Redirect user after logout
        })
      }
    >
      Logout
    </button>
  );
}
