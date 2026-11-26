variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "identity_id" {
  description = "User assigned managed identity used to pull the image and read Key Vault secrets."
  type        = string
}

variable "registry_server" {
  description = "Login server of the container registry, e.g. myregistry.azurecr.io."
  type        = string
}

variable "image" {
  description = "Full image reference including registry and tag."
  type        = string
}

variable "target_port" {
  description = "Port the container listens on."
  type        = number
}

variable "external_enabled" {
  description = "true makes the app reachable from the internet; false keeps it inside the environment."
  type        = bool
}

variable "cpu" {
  type    = number
  default = 0.25
}

variable "memory" {
  type    = string
  default = "0.5Gi"
}

variable "key_vault_secrets" {
  description = "Container App secret name => Key Vault secret URL."
  type        = map(string)
  default     = {}
}

variable "env" {
  description = "Plain (non-secret) environment variables."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Environment variable name => Container App secret name."
  type        = map(string)
  default     = {}
}

variable "postgres_enabled" {
  description = "Run a temporary PostgreSQL sidecar using the db-admin-password secret."
  type        = bool
  default     = false
}
