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