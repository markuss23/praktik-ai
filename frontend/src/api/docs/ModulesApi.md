# ModulesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createModule**](ModulesApi.md#createmodule) | **POST** /api/v1/modules | Endp Create Module |
| [**deleteModule**](ModulesApi.md#deletemodule) | **DELETE** /api/v1/modules/{module_id} | Endp Delete Module |
| [**getModule**](ModulesApi.md#getmodule) | **GET** /api/v1/modules/{module_id} | Endp Get Module |
| [**listModules**](ModulesApi.md#listmodules) | **GET** /api/v1/modules | List Modules |
| [**updateModule**](ModulesApi.md#updatemodule) | **PUT** /api/v1/modules/{module_id} | Endp Update Module |



## createModule

> Module createModule(moduleCreate)

Endp Create Module

### Example

```ts
import {
  Configuration,
  ModulesApi,
} from '';
import type { CreateModuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModulesApi();

  const body = {
    // ModuleCreate
    moduleCreate: ...,
  } satisfies CreateModuleRequest;

  try {
    const data = await api.createModule(body);
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
| **moduleCreate** | [ModuleCreate](ModuleCreate.md) |  | |

### Return type

[**Module**](Module.md)

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


## deleteModule

> deleteModule(moduleId)

Endp Delete Module

### Example

```ts
import {
  Configuration,
  ModulesApi,
} from '';
import type { DeleteModuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModulesApi();

  const body = {
    // number
    moduleId: 56,
  } satisfies DeleteModuleRequest;

  try {
    const data = await api.deleteModule(body);
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
| **moduleId** | `number` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getModule

> Module getModule(moduleId)

Endp Get Module

### Example

```ts
import {
  Configuration,
  ModulesApi,
} from '';
import type { GetModuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModulesApi();

  const body = {
    // number
    moduleId: 56,
  } satisfies GetModuleRequest;

  try {
    const data = await api.getModule(body);
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
| **moduleId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Module**](Module.md)

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


## listModules

> Array&lt;Module&gt; listModules(includeInactive, textSearch, courseId)

List Modules

### Example

```ts
import {
  Configuration,
  ModulesApi,
} from '';
import type { ListModulesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModulesApi();

  const body = {
    // boolean | Include inactive records (optional)
    includeInactive: true,
    // string | Text to search for (optional)
    textSearch: textSearch_example,
    // number (optional)
    courseId: 56,
  } satisfies ListModulesRequest;

  try {
    const data = await api.listModules(body);
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
| **courseId** | `number` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;Module&gt;**](Module.md)

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


## updateModule

> Module updateModule(moduleId, moduleUpdate)

Endp Update Module

### Example

```ts
import {
  Configuration,
  ModulesApi,
} from '';
import type { UpdateModuleRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ModulesApi();

  const body = {
    // number
    moduleId: 56,
    // ModuleUpdate
    moduleUpdate: ...,
  } satisfies UpdateModuleRequest;

  try {
    const data = await api.updateModule(body);
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
| **moduleId** | `number` |  | [Defaults to `undefined`] |
| **moduleUpdate** | [ModuleUpdate](ModuleUpdate.md) |  | |

### Return type

[**Module**](Module.md)

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

