import { StyleSheet, Dimensions } from "react-native";
import { COLORS } from "../../constants/colors";

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // removed shadow; use subtle border
    borderWidth: 1,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    elevation: 0,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: "600",
    marginLeft: 8,
  },
  booksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  booksTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  booksCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  booksList: {
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bookCaption: {
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 4,
    flex: 1,
  },
  bookDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 0,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
  topIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  illustrationImage: {
    width: width * 0.85, // 85% of screen width
    height: height * 0.25, // 25% of screen height
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  }
});

export default styles;