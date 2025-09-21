import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
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

// Get user by id (public)
export const getUserById = asyncHandler(async (req, res) => {
	const { id } = req.params;
	if (!id) return res.status(400).json({ message: 'Missing user id' });
	const user = await User.findById(id).select('-password');
	if (!user) return res.status(404).json({ message: 'User not found' });
	res.status(200).json({ user });
});

// Batch fetch users by array of ids
export const getUsersBatch = asyncHandler(async (req, res) => {
	const { ids } = req.body || {};
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Invalid ids' });
	// ensure valid ObjectId strings
	const users = await User.find({ _id: { $in: ids } }).select('-password');
	res.status(200).json({ users });
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

	console.log(`followUser: actor=${currentUser._id.toString()} target=${targetUserId}`);

	// determine current following state
	const isFollowing = (targetUser.followers || []).some((f) => f.toString() === currentUser._id.toString());
	console.log('followUser: initial isFollowing=', isFollowing);

	if (isFollowing) {
		// Try to perform both updates in a transaction for atomicity when supported
		let updatedTarget, updatedCurrent;
		try {
			const session = await mongoose.startSession();
			try {
				await session.withTransaction(async () => {
					updatedTarget = await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUser._id } }, { new: true, session }).select('followers');
					updatedCurrent = await User.findByIdAndUpdate(currentUser._id, { $pull: { following: targetUser._id } }, { new: true, session }).select('following');
					await Notification.deleteMany({ from: currentUser._id, to: targetUser._id, type: 'follow' }).session(session).catch(() => {});
				});
			} finally {
				session.endSession();
			}
		} catch (txErr) {
			// Transactions may not be supported (standalone mongod); fall back to non-transactional updates
			console.warn('followUser: transactions not available, falling back', txErr.message || txErr);
			try {
				[updatedTarget, updatedCurrent] = await Promise.all([
					User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUser._id } }, { new: true }).select('followers'),
					User.findByIdAndUpdate(currentUser._id, { $pull: { following: targetUser._id } }, { new: true }).select('following'),
				]);
				await Notification.deleteMany({ from: currentUser._id, to: targetUser._id, type: 'follow' }).catch(() => {});
			} catch (err) {
				console.error('followUser: error during unfollow fallback updates', err);
				return res.status(500).json({ message: 'Failed to unfollow user' });
			}
		}
		console.log(`followUser: unfollow completed targetFollowers=${(updatedTarget.followers || []).length} currentFollowing=${(updatedCurrent.following || []).length}`);
		return res.status(200).json({ message: 'Unfollowed user', isFollowing: false, followersCount: (updatedTarget.followers || []).length, followingCount: (updatedCurrent.following || []).length });
	}

	// follow using atomic $addToSet to prevent duplicates
	// Try to perform both updates in a transaction for atomicity when supported
	let updatedTarget2, updatedCurrent2;
	try {
		const session = await mongoose.startSession();
		try {
			await session.withTransaction(async () => {
				updatedTarget2 = await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } }, { new: true, session }).select('followers');
				updatedCurrent2 = await User.findByIdAndUpdate(currentUser._id, { $addToSet: { following: targetUser._id } }, { new: true, session }).select('following');
				try { await Notification.create([{ from: currentUser._id, to: targetUser._id, type: 'follow' }], { session }); } catch(e) { console.warn('Failed to create follow notification in tx', e); }
			});
		} finally {
			session.endSession();
		}
	} catch (txErr) {
		console.warn('followUser: transactions not available for follow, falling back', txErr.message || txErr);
		try {
			[updatedTarget2, updatedCurrent2] = await Promise.all([
				User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } }, { new: true }).select('followers'),
				User.findByIdAndUpdate(currentUser._id, { $addToSet: { following: targetUser._id } }, { new: true }).select('following'),
			]);
			try { await Notification.create({ from: currentUser._id, to: targetUser._id, type: 'follow' }); } catch(e) { console.warn('Failed to create follow notification', e); }
		} catch (err) {
			console.error('followUser: error during follow fallback updates', err);
			return res.status(500).json({ message: 'Failed to follow user' });
		}
	}

	console.log(`followUser: follow completed targetFollowers=${(updatedTarget2.followers || []).length} currentFollowing=${(updatedCurrent2.following || []).length}`);

	return res.status(200).json({ message: 'Followed user', isFollowing: true, followersCount: (updatedTarget2.followers || []).length, followingCount: (updatedCurrent2.following || []).length });

	// create notification for the target user
	try {
		await Notification.create({ from: currentUser._id, to: targetUser._id, type: 'follow' });
	} catch (e) {
		console.warn('Failed to create follow notification', e);
	}

	// fetch updated counts
	const updatedTarget = await User.findById(targetUserId).select('followers');
	const updatedCurrent = await User.findById(currentUser._id).select('following');

	console.log(`followUser: follow completed targetFollowers=${updatedTarget.followers.length} currentFollowing=${updatedCurrent.following.length}`);

	return res.status(200).json({ message: 'Followed user', isFollowing: true, followersCount: updatedTarget.followers.length, followingCount: updatedCurrent.following.length });
});

export default {};
