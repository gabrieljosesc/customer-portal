# Customer Portal POC - Technical Notes

## What Was Built
 - A full-stack customer portal with an Express.js backend and a Next.js frontend
 - Integration with the JobActivity,Attachment, and ServiceM8 Job APIs
 - A messaging system that is persistent and supports file attachments

## Approach & Reasoning
 - To minimize complicated database setup, lowdb was used for easy persistence.
 - Mock fallbacks were put in place to guarantee functioning in the event that ServiceM8 is unavailable.
 - Easy token-based authentication for quick POC creation

## Assumptions Made
 - The ServiceM8 API provides email-filterable customer data.
 - Direct download endpoints are available for file attachments.
 - For POC authentication, simple session tokens are sufficient.

## Potential Improvements
 - Put in place appropriate JWT authentication
 - Include input sanitization and validation.
 - Put in place appropriate error logging
 - For lengthy booking lists, add pagination.
 - Include the ability to upload files.

## AI Assistance
 - AI assisted with fixing TypeScript errors
 - Helped with integration patterns for the ServiceM8 API
 - Provided code structure best practices