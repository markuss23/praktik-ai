# ActivitiesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createActivity**](ActivitiesApi.md#createactivity) | **POST** /api/v1/activities | Endp Create Activity |
| [**getActivity**](ActivitiesApi.md#getactivity) | **GET** /api/v1/activities/{activity_id} | Endp Get Activity |
| [**listActivities**](ActivitiesApi.md#listactivities) | **GET** /api/v1/activities | List Activities |
| [**updateActivity**](ActivitiesApi.md#updateactivity) | **PUT** /api/v1/activities/{activity_id} | Endp Update Activity |



## createActivity

> Activity createActivity(activityCreate)

Endp Create Activity

### Example

```ts
import {
  Configuration,
  ActivitiesApi,
} from '';
import type { CreateActivityRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ActivitiesApi();

  const body = {
    // ActivityCreate
    activityCreate: ...,
  } satisfies CreateActivityRequest;

  try {
    const data = await api.createActivity(body);
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
| **activityCreate** | [ActivityCreate](ActivityCreate.md) |  | |

### Return type

[**Activity**](Activity.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getActivity

> Activity getActivity(activityId)

Endp Get Activity

### Example

```ts
import {
  Configuration,
  ActivitiesApi,
} from '';
import type { GetActivityRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ActivitiesApi();

  const body = {
    // number
    activityId: 56,
  } satisfies GetActivityRequest;

  try {
    const data = await api.getActivity(body);
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
| **activityId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Activity**](Activity.md)

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


## listActivities

> Array&lt;Activity&gt; listActivities(includeInactive, textSearch, moduleId, kind)

List Activities

### Example

```ts
import {
  Configuration,
  ActivitiesApi,
} from '';
import type { ListActivitiesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ActivitiesApi();

  const body = {
    // boolean | Include inactive records (optional)
    includeInactive: true,
    // string | Text to search for (optional)
    textSearch: textSearch_example,
    // number (optional)
    moduleId: 56,
    // ActivityKind (optional)
    kind: ...,
  } satisfies ListActivitiesRequest;

  try {
    const data = await api.listActivities(body);
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
| **includeInactive** | `boolean` | Include inactive records | [Optional] [Defaults to `false`] |
| **textSearch** | `string` | Text to search for | [Optional] [Defaults to `undefined`] |
| **moduleId** | `number` |  | [Optional] [Defaults to `undefined`] |
| **kind** | `ActivityKind` |  | [Optional] [Defaults to `undefined`] [Enum: learn, practice, assessment] |

### Return type

[**Array&lt;Activity&gt;**](Activity.md)

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


## updateActivity

> Activity updateActivity(activityId, activityCreate)

Endp Update Activity

### Example

```ts
import {
  Configuration,
  ActivitiesApi,
} from '';
import type { UpdateActivityRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ActivitiesApi();

  const body = {
    // number
    activityId: 56,
    // ActivityCreate
    activityCreate: ...,
  } satisfies UpdateActivityRequest;

  try {
    const data = await api.updateActivity(body);
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
| **activityId** | `number` |  | [Defaults to `undefined`] |
| **activityCreate** | [ActivityCreate](ActivityCreate.md) |  | |

### Return type

[**Activity**](Activity.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

