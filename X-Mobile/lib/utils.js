export function formatMemberSince(dataString) {
  const date = new Date(dataString);
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

export function formatDate(dataString) {
  const date = new Date(dataString);
  const month = date.toLocaleString('default', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function getProfileImageUri(userLike) {
  if (!userLike) return null;
  try {
    if (typeof userLike === 'string') return userLike;
    if (typeof userLike.profileImage === 'string') return userLike.profileImage;
    if (userLike.profileImage && typeof userLike.profileImage === 'object' && userLike.profileImage.secure_url) return userLike.profileImage.secure_url;
    if (userLike.avatar && typeof userLike.avatar === 'string') return userLike.avatar;
    const name = userLike.firstName || userLike.username || userLike.name || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  } catch (e) {
    return null;
  }
}