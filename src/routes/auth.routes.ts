import { createRouter } from "@/helpers";
import {
  permissionRequirement,
  uploadSingleFile,
  validateDTO,
  validateToken,
} from "@/middlewares";
import {
  CheckUserDto,
  CreateAccountDto,
  CreateAuthDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  ResetPasswordDto,
  SavePushTokenDto,
  VerifyEmailDto,
  NotificationDto,
  ChangePasswordDto,
  SetupPasswordDto,
  UpdateProfileDto,
  UpdateAddressDto,
} from "@/decorators";
import { AuthController } from "@/controllers";
import { UserTypes } from "@/enums";
import { googleLoginMiddleware } from "@/services";
import { IMAGE_MIMETYPES } from "@/constants";

export const authRouter = createRouter();
const authController = AuthController.getInstance();

authRouter.post(
  "/admin/login",
  validateDTO(LoginDto),
  authController.adminLogin
);

authRouter.post(
  "/user/forgot-password",
  validateDTO(ForgotPasswordDto),
  authController.userForgotPassword
);
authRouter.post(
  "/admin/forgot-password",
  validateDTO(ForgotPasswordDto),
  authController.forgotPassword
);

authRouter.get("/session", validateToken, authController.session);

authRouter.patch(
  "/change-password",
  validateToken,
  validateDTO(ChangePasswordDto),
  authController.changePassword
);

authRouter.post(
  "/setup-password",
  validateToken,
  validateDTO(SetupPasswordDto),
  authController.setupPassword
);

authRouter.patch(
  "/admin/reset-password",
  validateDTO(ResetPasswordDto),
  authController.adminResetPassword
);

authRouter.patch(
  "/user/reset-password",
  validateDTO(ResetPasswordDto),
  authController.userResetPassword
);

authRouter.patch(
  "/user/update-profile",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateProfileDto),
  authController.updateProfile
);

authRouter.patch(
  "/user/update-address",
  validateToken,
  permissionRequirement([UserTypes.USER]),
  validateDTO(UpdateAddressDto),
  authController.updateAddress
);

/**
 * Update user profile image
 * ✅ Validate the request is from an authenticated user
 * ✅ Check if the profileImage is provided and that it is of the supported mimetype
 */
authRouter.post(
  "/user/profile-image",
  validateToken,
  uploadSingleFile({
    name: "profileImage",
    required: true,
    mimeTypes: IMAGE_MIMETYPES,
  }),
  authController.updateProfileImage
);

authRouter.get("/admin/seed", authController.seedAdmin);

authRouter.get(
  "/user/send-otp",
  validateToken,
  authController.sendVerificationOTP
);

authRouter.post(
  "/user/verify-email",
  validateToken,
  validateDTO(VerifyEmailDto),
  authController.verifyEmail
);

authRouter.post("/user/login", validateDTO(LoginDto), authController.userLogin);

authRouter.post(
  "/user/register",
  validateDTO(CreateAccountDto),
  authController.register
);

authRouter.post("/logout", validateToken, authController.logout);

authRouter.route("/profile").get(validateToken, authController.getProfile);

authRouter.delete("/user/delete", validateToken, authController.deleteAccount);

authRouter.get(
  "/admin/get-users",
  validateToken,
  permissionRequirement([UserTypes.ADMIN]),
  authController.getUsers
);

authRouter.get(
  "/admin/get-admins",
  validateToken,
  permissionRequirement([UserTypes.ADMIN]),
  authController.getAdmins
);

authRouter.post(
  "/admin/create-admin",
  validateToken,
  permissionRequirement([UserTypes.ADMIN]),
  validateDTO(CreateAuthDto),
  authController.createAdmin
);

authRouter.post(
  "/google",
  validateDTO(GoogleLoginDto),
  googleLoginMiddleware(),
  authController.googleLogin
);

authRouter.patch(
  "/user/set-push-token",
  validateToken,
  validateDTO(SavePushTokenDto),
  authController.savePushToken
);

authRouter.post(
  "/send-notification",
  validateToken,
  permissionRequirement([UserTypes.ADMIN]),
  validateDTO(NotificationDto),
  authController.sendNotification
);
