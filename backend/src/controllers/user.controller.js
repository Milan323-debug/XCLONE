import asyncHandler from 'express-async-handler';
import User from '../models/user.model.js';
import cloudinary from '../config/cloudinary.js';
import Notification from '../models/notification.model.js';

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

	// If multer processed a 'profileImage' file, it'll be available as req.file
	// If multer processed other files (like bannerImage), they may be in req.files
	const updates = req.body || {};

	// handle multipart upload for profileImage (single file)
	const profileFile = req.file; // from upload.single('profileImage')
	if (profileFile && profileFile.buffer) {
		try {
			const base64Image = `data:${profileFile.mimetype};base64,${profileFile.buffer.toString('base64')}`;
			const uploadResponse = await cloudinary.uploader.upload(base64Image, {
				folder: 'profile_images',
				resource_type: 'image',
				transformation: [
					{ width: 800, height: 800, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.profileImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (profileFile):', uploadErr);
		}
	}
	const allowed = ['firstName', 'lastName', 'bio', 'location', 'profileImage', 'bannerImage'];
	// If profileImage or bannerImage is a base64 data URI (sent in body), upload to Cloudinary
	if (updates.profileImage && typeof updates.profileImage === 'string' && updates.profileImage.startsWith('data:')) {
		try {
			const uploadResponse = await cloudinary.uploader.upload(updates.profileImage, {
				folder: 'profile_images',
				resource_type: 'image',
				transformation: [
					{ width: 800, height: 800, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.profileImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (profileImage):', uploadErr);
			// leave updates.profileImage as-is; we'll still try to set it if it's a URL
		}
	}

	if (updates.bannerImage && typeof updates.bannerImage === 'string' && updates.bannerImage.startsWith('data:')) {
		try {
			const uploadResponse = await cloudinary.uploader.upload(updates.bannerImage, {
				folder: 'profile_banners',
				resource_type: 'image',
				transformation: [
					{ width: 1200, height: 400, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.bannerImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (bannerImage):', uploadErr);
		}
	}

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

	// determine current following state
	const isFollowing = targetUser.followers.some((f) => f.toString() === currentUser._id.toString());

	if (isFollowing) {
		// unfollow using atomic $pull to avoid races
		await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUser._id } });
		await User.findByIdAndUpdate(currentUser._id, { $pull: { following: targetUser._id } });

		// optional: remove follow notification (not strictly necessary)
		await Notification.deleteMany({ from: currentUser._id, to: targetUser._id, type: 'follow' }).catch(() => {});

		// fetch updated counts
		const updatedTarget = await User.findById(targetUserId).select('followers');
		const updatedCurrent = await User.findById(currentUser._id).select('following');

		return res.status(200).json({ message: 'Unfollowed user', isFollowing: false, followersCount: updatedTarget.followers.length, followingCount: updatedCurrent.following.length });
	}

	// follow using atomic $addToSet to prevent duplicates
	await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } });
	await User.findByIdAndUpdate(currentUser._id, { $addToSet: { following: targetUser._id } });

	// create notification for the target user
	try {
		await Notification.create({ from: currentUser._id, to: targetUser._id, type: 'follow' });
	} catch (e) {
		console.warn('Failed to create follow notification', e);
	}

	// fetch updated counts
	const updatedTarget = await User.findById(targetUserId).select('followers');
	const updatedCurrent = await User.findById(currentUser._id).select('following');

	return res.status(200).json({ message: 'Followed user', isFollowing: true, followersCount: updatedTarget.followers.length, followingCount: updatedCurrent.following.length });
});

export default {};
