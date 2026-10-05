export function getInstagramProfileUrl(username: string | null) {
	if (!username?.trim()) {
		return null;
	}

	return `https://www.instagram.com/${username.trim()}/`;
}
