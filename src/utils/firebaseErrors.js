export function getFirebaseErrorMessage(error) {
    const code = error?.code;

    // Common FirebaseErrors 
    switch (code) {
        case "auth/email-already-in-use":
            return "Invalid email address.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/invalid-credential":
            return "Invalid account details.";
        case "auth/credential-already-in-use":
            return "Invalid account details.";
        case "auth/invalid-password":
            return "Invalid Password.";
        case "auth/weak-password":
            return "Password must be at least 8 characters.";
        case "auth/user-not-found":
            return "Invalid account information.";
        case "auth/wrong-password":
            return "Incorrect email or password.";
        case "auth/too-many-requests":
            return "Too many attempts. Try again later.";
        case "auth/email-not-verified":
            return "Please verify your email before logging in.";
        case "auth/network-request-failed":
            return "Network failure. Check your network connection.";
        case "already-exists":
            return "Invalid account details.";
        case "not-found":
            return "Requested resource was not found.";
        case "permission-denied":
            return "Permission error. System failure";
        default:
            return error?.message || "Something went wrong. Please try again.";
    }
}
