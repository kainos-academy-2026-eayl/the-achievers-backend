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

variable "image_tag" {
  description = "Image tag deployed for both the frontend and backend."
  type        = string
  default     = "latest"
}
