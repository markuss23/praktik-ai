"use client";

import { useAuth } from "./useAuth";
import { hasMinRole, ROLE_LABELS, type AppRole } from "@/lib/keycloak";

/**
 * Provides the current user's role and permission helpers.
 *
 * Role hierarchy (each inherits the one below):
 *   user < lector < guarantor < superadmin
 */
export function useRole() {
  const { user } = useAuth();
  const role: AppRole = user?.role ?? "user";

  return {
    role,
    roleLabel: ROLE_LABELS[role],

    /** true when the user has at least the 'lector' role */
    isLector: hasMinRole(role, "lector"),

    /** true when the user has at least the 'guarantor' role */
    isGuarantor: hasMinRole(role, "guarantor"),

    /** true when the user is superadmin */
    isSuperAdmin: role === "superadmin",

    /** Generic check: does the user have at least minRole? */
    can: (minRole: AppRole) => hasMinRole(role, minRole),
  };
}
