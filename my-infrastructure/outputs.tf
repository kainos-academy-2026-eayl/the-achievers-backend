output "resource_group_name" {
  value = module.resource_group.resource_group_name
}

output "resource_group_location" {
  value = var.location
}

output "resource_group_id" {
  value = module.resource_group.resource_group_id
}

output "frontend_resource_group_name" {
  value = module.frontend_resource_group.resource_group_name
}

output "frontend_resource_group_id" {
  value = module.frontend_resource_group.resource_group_id
}

output "key_vault_name" {
  value = module.key_vault.key_vault_name
}

output "key_vault_uri" {
  value = module.key_vault.key_vault_uri
}

output "managed_identity_id" {
  value = module.managed_identity.id
}

output "managed_identity_client_id" {
  value = module.managed_identity.client_id
}

output "container_app_environment_id" {
  value = module.container_app_environment.id
}

output "container_app_environment_default_domain" {
  value = module.container_app_environment.default_domain
}

output "backend_internal_url" {
  value = "https://${module.backend_app.fqdn}"
}

output "frontend_url" {
  value = "https://${module.frontend_app.fqdn}"
}

output "postgres_fqdn" {
  value = module.postgres.fqdn
}

output "postgres_database_name" {
  value = module.postgres.database_name
}