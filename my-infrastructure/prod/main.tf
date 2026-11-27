terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-achievers-backend-tfstate-prod"
    storage_account_name = "stachieversprodstate123"
    container_name       = "tfstate"
    key                  = "achievers-backend-prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
}

locals {
  location                     = "uksouth"
  backend_resource_group_name  = "rg-achievers-backend-prod"
  frontend_resource_group_name = "rg-achievers-frontend-prod"
  key_vault_name               = "kv-achievers-prod"
  managed_identity_name        = "id-achievers-prod"
  log_analytics_workspace_name = "log-achievers-prod"
  container_app_env_name       = "cae-achievers-prod"
}

module "resource_group" {
  source              = "../modules/resource-group"
  resource_group_name = local.backend_resource_group_name
  location            = local.location
}

module "frontend_resource_group" {
  source              = "../modules/resource-group"
  resource_group_name = local.frontend_resource_group_name
  location            = local.location
}

# Secrets are added manually in the portal, never in Terraform.
module "key_vault" {
  source              = "../modules/key-vault"
  key_vault_name      = local.key_vault_name
  resource_group_name = module.resource_group.resource_group_name
  location            = local.location
}

# Will be used by the Container Apps to pull images from ACR and read Key Vault secrets.
module "managed_identity" {
  source              = "../modules/managed-identity"
  name                = local.managed_identity_name
  resource_group_name = module.resource_group.resource_group_name
  location            = local.location
}

# Where the prod frontend and backend apps will run once they're added.
module "container_app_environment" {
  source                         = "../modules/container-app-environment"
  container_app_environment_name = local.container_app_env_name
  log_analytics_workspace_name   = local.log_analytics_workspace_name
  resource_group_name            = module.resource_group.resource_group_name
  location                       = local.location
}
