variable "project" {
  description = "Project name used as part of every resource name."
  type        = string
  default     = "achievers"

  validation {
    condition     = can(regex("^[a-z0-9-]{1,20}$", var.project))
    error_message = "project must be 1-20 characters of lowercase letters, numbers or hyphens."
  }
}

variable "environment" {
  description = "Deployment environment, used as a suffix in resource names."
  type        = string

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, prod."
  }
}

variable "location" {
  description = "Azure region for the resource groups."
  type        = string
  default     = "uksouth"

  validation {
    condition     = contains(["uksouth", "ukwest", "northeurope", "westeurope"], var.location)
    error_message = "location must be one of: uksouth, ukwest, northeurope, westeurope."
  }
}

variable "acr_name" {
  description = "Name of the existing Azure Container Registry holding the app images."
  type        = string
}

# No defaults: CI must pass these so each new image creates a new revision.
variable "backend_image_tag" {
  description = "Backend image tag: the backend repo commit SHA that CI pushed."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.backend_image_tag))
    error_message = "backend_image_tag must be a full 40-character commit SHA, not a mutable tag such as latest."
  }
}

variable "frontend_image_tag" {
  description = "Frontend image tag: the frontend repo commit SHA that CI pushed."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.frontend_image_tag))
    error_message = "frontend_image_tag must be a full 40-character commit SHA, not a mutable tag such as latest."
  }
}

variable "db_name" {
  description = "Name of the application database."
  type        = string
  default     = "achievers"
}

variable "db_admin_username" {
  description = "Administrator login for the PostgreSQL server."
  type        = string
}

variable "db_admin_password" {
  description = "Administrator password for the PostgreSQL server, from the DB_ADMIN_PASSWORD GitHub secret."
  type        = string
  sensitive   = true
  ephemeral   = true
}
