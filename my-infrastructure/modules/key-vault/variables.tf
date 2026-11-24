variable "key_vault_name" {
  type = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.key_vault_name))
    error_message = "key_vault_name must be 3-24 characters, start with a letter, end with a letter or number, and contain only letters, numbers or hyphens."
  }
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}
