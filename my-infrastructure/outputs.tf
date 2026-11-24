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