# AgentsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**generateCourseApiV1AgentsGenerateCoursePost**](AgentsApi.md#generatecourseapiv1agentsgeneratecoursepost) | **POST** /api/v1/agents/generate-course | Generate Course |



## generateCourseApiV1AgentsGenerateCoursePost

> GenerateCourseResponse generateCourseApiV1AgentsGenerateCoursePost(courseId)

Generate Course

Endpoint pro generování kurzu z obsahu.

### Example

```ts
import {
  Configuration,
  AgentsApi,
} from '';
import type { GenerateCourseApiV1AgentsGenerateCoursePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentsApi();

  const body = {
    // number
    courseId: 56,
  } satisfies GenerateCourseApiV1AgentsGenerateCoursePostRequest;

  try {
    const data = await api.generateCourseApiV1AgentsGenerateCoursePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**GenerateCourseResponse**](GenerateCourseResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

