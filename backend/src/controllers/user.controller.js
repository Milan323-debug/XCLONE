import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';

// Get current authenticated user
export const getCurrentUser = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });
	res.status(200).json({ user });
});

// Get public profile by username
export const getUserProfile = asyncHandler(async (req, res) => {
	const { username } = req.params;
	const user = await User.findOne({ username }).select('-password');
	if (!user) return res.status(404).json({ message: 'User not found' });
	res.status(200).json({ user });
});

// Sync user (placeholder - ensure user exists / create minimal record)
export const syncUser = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });
	// This endpoint can be used to refresh profile data from external auth provider
	res.status(200).json({ user });
});

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });

	const updates = req.body;
	const allowed = ['firstName', 'lastName', 'bio', 'location', 'profileImage', 'bannerImage'];
	Object.keys(updates).forEach((key) => {
		if (allowed.includes(key)) user[key] = updates[key];
	});

	await user.save();
	res.status(200).json({ user });
});

// Follow / unfollow user
export const followUser = asyncHandler(async (req, res) => {
	const currentUser = req.user;
	const { targetUserId } = req.params;
	if (!currentUser) return res.status(401).json({ message: 'Not authenticated' });

	if (currentUser._id.toString() === targetUserId) {
		return res.status(400).json({ message: "You can't follow yourself" });
	}

	const targetUser = await User.findById(targetUserId);
	if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

	const isFollowing = targetUser.followers.some((f) => f.toString() === currentUser._id.toString());

	if (isFollowing) {
		// unfollow
		targetUser.followers = targetUser.followers.filter((f) => f.toString() !== currentUser._id.toString());
		currentUser.following = currentUser.following.filter((f) => f.toString() !== targetUser._id.toString());
		await targetUser.save();
		await currentUser.save();
		return res.status(200).json({ message: 'Unfollowed user' });
	}

	// follow
	targetUser.followers.push(currentUser._id);
	currentUser.following.push(targetUser._id);
	await targetUser.save();
	await currentUser.save();
	return res.status(200).json({ message: 'Followed user' });
});

export default {};

