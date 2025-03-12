
// GitHub OAuth configuration
// In a real application, these should be environment variables
const GITHUB_CLIENT_ID = "your-github-client-id"; // Replace with your GitHub OAuth App client ID
const GITHUB_REDIRECT_URI = `${window.location.origin}/auth/github/callback`;

export const initiateGitHubAuth = () => {
  // Store the current URL so we can redirect back after auth
  localStorage.setItem('authRedirectPath', window.location.pathname);
  
  // Construct the GitHub OAuth URL
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=user:email`;
  
  // Redirect to GitHub for authentication
  window.location.href = githubAuthUrl;
};

export const handleGitHubCallback = async (code: string) => {
  try {
    // In a real application, you would make a server request to exchange the code for an access token
    // Since we're using a client-only approach for this demo, we'll simulate the exchange
    
    // Simulate API call to exchange code for token
    // In production, this would be a server endpoint that securely exchanges the code for a token
    console.log("Exchanging code for token:", code);
    
    // Simulate successful authentication
    // In a real app, we would make an API call to get the user profile with the token
    const mockUserProfile = {
      email: `github-user-${Date.now()}@example.com`,
      name: "GitHub User",
      avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
    };
    
    // Store auth data
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(mockUserProfile));
    
    // Get the redirect path or default to dashboard
    const redirectPath = localStorage.getItem('authRedirectPath') || '/dashboard';
    localStorage.removeItem('authRedirectPath');
    
    return {
      success: true,
      redirectPath
    };
  } catch (error) {
    console.error("GitHub authentication error:", error);
    return {
      success: false,
      error: "Failed to authenticate with GitHub"
    };
  }
};
