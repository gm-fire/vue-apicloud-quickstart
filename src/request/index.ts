import { RequestConfig, ResponseError, ResponseType } from './model'
import axios, { CancelTokenSource } from 'axios'
export class NetworkRequest {
  private baseUrl = '';
  private tag: string | CancelTokenSource = '' ;
  public requestOptions: RequestConfig;

  constructor(opts?: RequestConfig) {
    this.requestOptions = {
      url: '',
      headers: {},
      method: 'get',
      timeout: 30,
      dataType: 'json',
      returnAll: false,
      charset: 'utf-8',
      report: false,
      cache: false,
      safeMode: 'none',
      ...opts
    }
  }

  interceptor(opts: RequestConfig) {
    // 请求拦截器
    return opts
  }

  /**
   * @param ret
   *
   * returnAll 参数传 true 时，内部字段为
   * 
   *     statusCode 状态码，数字类型
   * 
   *     headers 响应头，JSON对象
   * 
   *     body 消息体，即服务器返回的数据。若dataType为json，那么body为JSON对象，否则为字符串
   * 
   *
   * 上传文件时，若 report 字段传 true 返回上传进度时，原服务器返回数据会被放在 body 字段里面，内部字段为
   *
   *     progress 上传进度，0.00-100.00
   * 
   *     status 上传状态，数字类型。（0：上传中、1：上传完成、2：上传失败）
   * 
   *     body 上传完成时，服务器返回的数据。若 dataType 为 json，那么 body 为 JSON 对象，否则为字符串
   * 
   */
  afterRequest(ret: ResponseType) {
    // 请求成功后的回调
    return ret
  }

  /**
   * @param err
   * 
   *    statusCode 网络请求状态码，数字类型
   *    code 错误码，数字类型。（0：连接错误、1：超时、2：授权错误、3：数据类型错误、4：不安全的数据）
   *    msg 错误描述，字符串类型
   *    body 服务器返回的原始数据
   * 
   */
  handleError(err: ResponseError) {
    // 统一的错误处理
    return err
  }

  /**
   * @param opts.method  (可选， 默认 get)
   * get、post、put、delete、head、options、trace、patch
   *
   * @param opts.data (可选， 默认 无)
   * {
   *   stream："",
   *    // 以二进制流的方式提交文件。stream为文件路径（字符串类型）
   *    // 支持绝对路径，以及fs://、cache://、box://等文件路径协议
   *    // 可直接使用其他端API返回的结果，如 api.getPicture 回调的 ret.data 等
   *   body："",
   *    // 以纯文本的方式提交数据，body支持字符串及JSON对象
   *    // 提交JSON对象时，需设置application/json类型的Content-Type头
   *   values：{},
   *    // 以表单方式提交参数（JSON对象）, 如 {"field1": "value1", "field1": "value2"} (直接传JSON对像.)
   *   files：{}
   *    // 以表单方式提交文件，支持多文件上传（JSON对象）,如 {"file": "path"}
   *    // 也支持同一字段对应多文件：{"file":["path1","path2"]}
   *    // 文件路径，支持绝对路径，以及fs://、cache://、box://等文件路径协议
   *    // 可直接使用其他端API返回的结果，如api.getPicture回调的ret.data等.
   * }
   *
   * @param opts.certificate (可选， 默认 无)
   * {
   *   path:'',          // p12证书路径，支持fs://、widget://、cache://等文件路径协议，字符串类型
   *   password:''       // 证书密码，字符串类型
   * }
   *
   * @param opts.safeMode (可选， 默认 none)
   *  none              // 不做数据安全检查
   *  both              // 对请求和响应的数据做安全检查
   *  request           // 对请求数据做安全检查
   *  response          // 对响应的数据做安全检查
   *
   * @param opts.proxy (可选， 默认 无)
   * {
   *   host:          // 服务器地址，字符串类型
   *   port:          // 服务器端口，数字类型
   * }
   */
  request(opts: RequestConfig) {
    const isHttpUrl = (url: string): boolean => ['https://', 'http://', '//'].some(e => url.startsWith(e))
    this.tag = opts.tag || this.tag || `ajax-${new Date().getTime()}`
    this.requestOptions = {
      ...this.requestOptions,
      ...opts,
      tag: this.tag,
      url: isHttpUrl(opts.url) ? opts.url : `${this.baseUrl}${opts.url}`,
      data: {
        values: opts.data,
        files: opts.files,
        stream: opts.stream,
        body: opts.body,
      }
    }
    if (typeof api !== "undefined") {
      const isContinue = this.interceptor(this.requestOptions)
      if (!isContinue) return new Promise((resolve, reject) => reject(isContinue))
      return new Promise((resolve, reject) => {
        window.api.ajax(this.requestOptions,
          (ret: ResponseType, err: ResponseError) => {
            if (ret) {
              return resolve(this.afterRequest(ret))
            } else {
              this.handleError(err)
              return reject(err)
            }
          }
        )
      })
    } else {
      this.tag = typeof this.tag === 'string' ? axios.CancelToken.source() : this.tag
      this.requestOptions.tag = this.tag
      const isContinue = this.interceptor(this.requestOptions)
      if (!isContinue) return new Promise((resolve, reject) => reject(isContinue))
      return axios.request({
        url: this.requestOptions.url,
        method: this.requestOptions.method,
        baseURL: this.baseUrl,
        headers: this.requestOptions.headers,
        data: this.requestOptions.data.values || this.requestOptions.data.body,
        /**
         * 超时时间
         * 单位：毫秒
         */
        timeout: (this.requestOptions.timeout || 30) * 1000,
        // 'proxy' 定义代理服务器的主机名称和端口
        // `auth` 表示 HTTP 基础验证应当用于连接代理，并提供凭据
        // 这将会设置一个 `Proxy-Authorization` 头，覆写掉已有的通过使用 `header` 设置的自定义 `Proxy-Authorization` 头。
        proxy: this.requestOptions.proxy,

        // `cancelToken` 指定用于取消请求的 cancel token
        // （查看后面的 Cancellation 这节了解更多）
        cancelToken: (this.tag as CancelTokenSource).token
      })
      .then((rs: any) => rs.data)
      .then((rs: any) => {
        return this.afterRequest(rs)
      })
      .catch((err: any) => {
        return this.handleError(err)
      })
    }
  }

  get(url: string, data?: Record<string, any>) {
    if (data) {
      let params = Object.keys(data).reduce((t, k, ci, arr) => `${t}${data[k] ? `${k}=${data[k]}${ci === arr.length - 1 ? '' : '&'}` : ''}`, '')
      params = ['&', '='].includes(params[params.length - 1]) ? params.substring(0, params.length - 1) : params
      url = `${url}?${params}`
    }
    return this.request({ url })
  }

  post(url: string, data: any, headers?: any) {
    return this.request({ url, data, headers, method: 'post' })
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  setTag(tag: string) {
    if (typeof api !== 'undefined') {
      this.tag = tag
    } else {
      this.tag = axios.CancelToken.source()
    }
  }

  getTag() {
    return this.tag
  }

  cancelAjax(tag: string, msg?: string) {
    if (typeof api !== 'undefined') {
      window.api.cancelAjax({ tag })
    } else {
      (this.tag as CancelTokenSource).cancel(msg)
    }
  }
}

export default new NetworkRequest()
