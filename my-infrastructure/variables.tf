variable "resource_group_name" {
  description = "Name of the Azure resource group."
  type        = string
  default     = "rg-achievers-backend-dev"

  validation {
    condition     = can(regex("^[a-zA-Z0-9_().-]{0,89}[a-zA-Z0-9_()-]$", var.resource_group_name))
    error_message = "resource_group_name must be 1-90 characters (letters, numbers, _ ( ) . -) and cannot end with a period."
  }
}

variable "location" {
  description = "Azure region for the resource group."
  type        = string
  default     = "uksouth"

  validation {
    condition     = contains(["uksouth", "ukwest", "northeurope", "westeurope"], var.location)
    error_message = "location must be one of: uksouth, ukwest, northeurope, westeurope."
  }
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be one of: dev, test, prod."
  }
}