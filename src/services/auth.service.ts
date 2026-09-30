import bcrypt from "bcryptjs";
import { userRepository } from "@/repositories/user.repository";
import { auditRepository } from "@/repositories/audit.repository";
import { signSessionToken } from "@/lib/auth";
import { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/core/errors";

export class AuthService {
  async loginWithPassword(rawMobile: string, rawPassword: string) {
    let mobile = (rawMobile || "").toString().trim().replace(/[^0-9]/g, "");
    if (mobile.length === 12 && mobile.startsWith("91")) mobile = mobile.slice(2);
    const password = (rawPassword || "").toString();

    if (!mobile || mobile.length !== 10) {
      throw new ValidationError("Please enter a valid 10-digit mobile number.");
    }
    if (!password) {
      throw new ValidationError("Please enter your password.");
    }

    const user = await userRepository.findByMobile(mobile);
    if (!user) {
      throw new UnauthorizedError("Invalid mobile number or password.");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenError("Your account has been deactivated. Please contact the administrator.");
    }

    if (!user.password) {
      throw new UnauthorizedError("Account password is not configured. Please contact the administrator.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid mobile number or password.");
    }

    const mustChangePassword = Boolean(user.mustChangePassword);

    const token = await signSessionToken({
      userId: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role as "ADMIN" | "EMPLOYEE",
      mustChangePassword,
    });

    await auditRepository.recordLog(
      user.id,
      "USER_LOGIN",
      "USER",
      user.id,
      `${user.name} (${user.role}) logged in successfully${mustChangePassword ? " (default password - change required)" : ""}`
    );

    return {
      token,
      mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email,
        mustChangePassword,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword) {
      throw new ValidationError("Please enter your current password.");
    }
    if (!newPassword || newPassword.length < 6) {
      throw new ValidationError("New password must be at least 6 characters long.");
    }
    if (currentPassword === newPassword) {
      throw new ValidationError("New password must be different from current password.");
    }

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundError("User account not found.");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenError("Your account is inactive.");
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new ValidationError("Current password is incorrect.");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Mark mustChangePassword as false
    await userRepository.updatePassword(userId, hashedNewPassword, false);

    await auditRepository.recordLog(
      user.id,
      "CHANGE_PASSWORD",
      "USER",
      user.id,
      `${user.name} (${user.role}) changed their password`
    );

    // Generate new refreshed token with mustChangePassword: false
    const token = await signSessionToken({
      userId: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role as "ADMIN" | "EMPLOYEE",
      mustChangePassword: false,
    });

    return {
      success: true,
      message: "Password changed successfully.",
      token,
      mustChangePassword: false,
    };
  }
  async sendOtp(rawMobile: string) {
    let mobile = (rawMobile || "").toString().trim().replace(/[^0-9]/g, "");
    if (mobile.length === 12 && mobile.startsWith("91")) mobile = mobile.slice(2);

    if (!mobile || mobile.length !== 10) {
      throw new ValidationError("Please enter a valid 10-digit mobile number.");
    }

    const user = await userRepository.findByMobile(mobile);
    if (!user) {
      throw new NotFoundError("Mobile number is not registered. Please contact the administrator.");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenError("Your account is inactive. Please contact the administrator.");
    }

    const devOtp = process.env.DEV_OTP || "123456";
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await userRepository.saveOtp(mobile, devOtp, expiresAt);

    return {
      success: true,
      message: "OTP sent successfully.",
      mobile,
      devOtp,
    };
  }

  async verifyOtp(rawMobile: string, rawCode: string) {
    let mobile = (rawMobile || "").toString().trim().replace(/[^0-9]/g, "");
    if (mobile.length === 12 && mobile.startsWith("91")) mobile = mobile.slice(2);
    const code = (rawCode || "").toString().trim();

    if (!mobile || mobile.length !== 10) {
      throw new ValidationError("Please provide a valid 10-digit mobile number.");
    }
    if (!code || code.length !== 6) {
      throw new ValidationError("Please enter the complete 6-digit OTP.");
    }

    const otpRecord = await userRepository.findValidOtp(mobile, code);
    if (!otpRecord) {
      throw new ValidationError("The OTP you entered is incorrect.");
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new ValidationError("OTP has expired. Please request a new one.");
    }

    const user = await userRepository.findByMobile(mobile);
    if (!user) {
      throw new NotFoundError("User record not found.");
    }

    if (user.status === "INACTIVE") {
      throw new ForbiddenError("Your account is inactive. Please contact the administrator.");
    }

    await userRepository.markOtpVerified(otpRecord.id);

    const token = await signSessionToken({
      userId: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role as "ADMIN" | "EMPLOYEE",
    });

    await auditRepository.recordLog(
      user.id,
      "USER_LOGIN",
      "USER",
      user.id,
      `${user.name} (${user.role}) logged in via OTP`
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || user.status === "INACTIVE") {
      throw new UnauthorizedError();
    }
    return user;
  }
}

export const authService = new AuthService();
