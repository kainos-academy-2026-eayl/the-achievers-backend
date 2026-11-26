terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Remaining settings are supplied per environment at init time:
  #   terraform init -backend-config=environments/<env>.backend.hcl
  backend "azurerm" {
    use_azuread_auth = true
  }
}

# Subscription and credentials come from ARM_* environment variables
# (OIDC service principal in CI, Azure CLI locally).
provider "azurerm" {
  features {}
}

locals {
  backend_resource_group_name  = "rg-${var.project}-backend-${var.environment}"
  frontend_resource_group_name = "rg-${var.project}-frontend-${var.environment}"
  key_vault_name               = "kv-${var.project}-${var.environment}"
  managed_identity_name        = "id-${var.project}-${var.environment}"
  log_analytics_workspace_name = "log-${var.project}-${var.environment}"
  container_app_env_name       = "cae-${var.project}-${var.environment}"
  backend_app_name             = "ca-${var.project}-backend-${var.environment}"
  frontend_app_name            = "ca-${var.project}-frontend-${var.environment}"
  registry_server              = "${var.acr_name}.azurecr.io"
  key_vault_secrets_url        = "${module.key_vault.key_vault_uri}secrets"

  # Built from the name rather than the frontend module's output, which would
  # create a cycle (the frontend already depends on the backend's URL).
  frontend_url = "https://${local.frontend_app_name}.${module.container_app_environment.default_domain}"
}

moved {
  from = azurerm_resource_group.main
  to   = module.resource_group.azurerm_resource_group.this
}

module "resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = local.backend_resource_group_name
  location            = var.location
}
module "frontend_resource_group" {
  source              = "./modules/resource-group"
  resource_group_name = local.frontend_resource_group_name
  location            = var.location
}
# Secrets are added manually in the portal, never in Terraform.
module "key_vault" {
  source              = "./modules/key-vault"
  key_vault_name      = local.key_vault_name
  resource_group_name = module.resource_group.resource_group_name
  location            = var.location
}
# Used by the Container Apps to pull images from ACR and read Key Vault secrets.
module "managed_identity" {
  source              = "./modules/managed-identity"
  name                = local.managed_identity_name
  resource_group_name = module.resource_group.resource_group_name
  location            = var.location
}
# Shared by the frontend and backend apps so they can talk to each other privately.
module "container_app_environment" {
  source                         = "./modules/container-app-environment"
  container_app_environment_name = local.container_app_env_name
  log_analytics_workspace_name   = local.log_analytics_workspace_name
  resource_group_name            = module.resource_group.resource_group_name
  location                       = var.location
}
# The identity's AcrPull and Key Vault Secrets User roles were assigned manually
# by an admin, because the pipeline's service principal can't assign roles.
module "backend_app" {
  source                       = "./modules/container-app"
  name                         = local.backend_app_name
  resource_group_name          = module.resource_group.resource_group_name
  container_app_environment_id = module.container_app_environment.id
  identity_id                  = module.managed_identity.id
  registry_server              = local.registry_server
  image                        = "${local.registry_server}/the-achievers-backend:${var.backend_image_tag}"
  target_port                  = 3000
  external_enabled             = false
  postgres_enabled             = true

  key_vault_secrets = {
    "database-url"      = "${local.key_vault_secrets_url}/database-url"
    "jwt-secret"        = "${local.key_vault_secrets_url}/jwt-secret"
    "db-admin-password" = "${local.key_vault_secrets_url}/DB-ADMIN-PASSWORD"
    "admin-password"    = "${local.key_vault_secrets_url}/ADMIN-PASSWORD"
  }
  secret_env = {
    DATABASE_URL   = "database-url"
    JWT_SECRET     = "jwt-secret"
    ADMIN_PASSWORD = "admin-password"
  }
  env = {
    BOOTSTRAP_DATABASE = "true"
    PORT               = "3000"
    FRONTEND_ORIGIN    = local.frontend_url
  }
}
module "frontend_app" {
  source                       = "./modules/container-app"
  name                         = local.frontend_app_name
  resource_group_name          = module.frontend_resource_group.resource_group_name
  container_app_environment_id = module.container_app_environment.id
  identity_id                  = module.managed_identity.id
  registry_server              = local.registry_server
  image                        = "${local.registry_server}/the-achievers-frontend:${var.frontend_image_tag}"
  target_port                  = 3002
  external_enabled             = true

  key_vault_secrets = {
    "session-secret" = "${local.key_vault_secrets_url}/session-secret"
  }
  secret_env = {
    SESSION_SECRET = "session-secret"
  }
  env = {
    PORT         = "3002"
    NODE_ENV     = "production"
    API_BASE_URL = "https://${module.backend_app.fqdn}"
  }
}
