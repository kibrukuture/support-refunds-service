resource "aws_sqs_queue" "refund_jobs_dlq" {
  name                      = "${local.name}-refund-jobs-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "refund_jobs" {
  name                       = "${local.name}-refund-jobs"
  visibility_timeout_seconds = var.queue_visibility_timeout_seconds
  message_retention_seconds  = 1209600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.refund_jobs_dlq.arn
    maxReceiveCount     = 5
  })
}
