output "api_service_name" {
  value = aws_ecs_service.api.name
}

output "worker_service_name" {
  value = aws_ecs_service.worker.name
}

output "migrate_task_definition" {
  value = aws_ecs_task_definition.migrate.family
}

output "database_endpoint" {
  value = aws_db_instance.postgres.address
}

output "refund_queue_url" {
  value = aws_sqs_queue.refund_jobs.url
}
