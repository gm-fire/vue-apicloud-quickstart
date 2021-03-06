import { Base64 } from 'js-base64'
import {
  WindowParams,
  FrameParams,
  PageConfig,
  InstallOptions,
  AnimationType,
  PullDownRefreshOptions,
  ToastParam,
  StatusBar,
} from '../models'

export interface Page extends PageConfig {
  htmlPath: string;
}

export interface ObjectMap<T> {
  [any: string]: T;
}

export interface OpenWinOptions {
  name?: string;
  pageParam?: any;
  animation?: AnimationType;
  winOpts?: WindowParams;
}

export interface CloseWinOptions {
  name?: string;
  animation?: AnimationType;
}

export interface SafeArea {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export default (opts: InstallOptions): ObjectMap<any> => {
  const { pages } = opts

  const isHttpUrl = (url: string): boolean =>
    ['https://', 'http://', '//'].some((e) => url.startsWith(e))

  const getPageMap: () => ObjectMap<Page> = () => {
    return pages.reduce((rst: ObjectMap<Page>, page: PageConfig) => {
      rst[page.name] = {
        ...page,
        htmlPath: page.path.replace(/\/(\w)/, (match: any, $1: string) =>
          $1.toLocaleLowerCase()
        ),
      }
      return rst
    }, {})
  }

  const getQueryString = (name: string) => {
    const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i')
    const r = window.location.search.substr(1).match(reg)
    return r != null ? decodeURI(r[2]) : null
  }

  const bindKeyBackExitApp = () => {
    if (typeof api !== 'undefined') {
      window.api.addEventListener(
        {
          name: 'keyback',
        },
        () => {
          window.api.toast({
            msg: '再按一次返回键退出' + window.api.appName,
            duration: 2000,
            location: 'bottom',
          })
          window.api.addEventListener(
            {
              name: 'keyback',
            },
            () => {
              window.api.closeWidget({ silent: true })
            }
          )
          setTimeout(() => {
            bindKeyBackExitApp()
          }, 3000)
        }
      )
    }
  }

  const n2p = (name: string) => {
    if (getPageMap()[name]) {
      return getPageMap()[name].htmlPath
    } else {
      return undefined
    }
  }

  const open = (
    url: string,
    { name, pageParam, animation, winOpts }: OpenWinOptions = {}
  ) => {
    url = url.endsWith('.html') ? url : isHttpUrl(url) ? url : url + '.html'
    if (typeof api === 'undefined') {
      if (pageParam) {
        url = `${url}?pageParam=${Base64.encodeURI(JSON.stringify(pageParam))}`
      }
      window.top.location.href = url
      return
    }
    name = name ? name : `win_${url}`
    const params: WindowParams = {
      name,
      url,
      pageParam,
      animation,
      ...(winOpts || {}),
    }
    window.api.openWin(params)
  }

  const push = (opts: string | OpenWinOptions) => {
    if (typeof opts === 'string') {
      return open(opts)
    }
    const { name = '' } = opts
    const url = n2p(name)
    if (url) {
      return open(url, opts)
    }
  }

  const replace = (opts: string | OpenWinOptions) => {
    const currentWin = api.winName
    push(opts)
    if (typeof api === 'undefined') return
    const time =
      typeof opts === 'object' && opts.animation && opts.animation.duration
        ? opts.animation.duration
        : 0
    setTimeout(() => {
      window.api.closeWin({ name: currentWin, animation: { type: 'none' } })
    }, time)
  }

  const close = (opts?: CloseWinOptions) => {
    if (typeof api === 'undefined') {
      window.history.back()
      return
    }
    window.api.closeWin(opts)
  }

  const closeToWin = ({
    url,
    animation,
  }: {
    url: string;
    animation?: AnimationType;
  }) => {
    url = url.endsWith('.html') ? url : url + '.html'
    if (typeof api !== 'undefined') {
      const name = `win_${url}`
      if (animation) {
        window.api.closeToWin({ name, animation })
      } else {
        window.api.closeToWin({ name })
      }
    } else {
      window.location.href = url
    }
  }

  const pageParam = () => {
    if (typeof api !== 'undefined') {
      return window.api.pageParam
    } else {
      const param = getQueryString('pageParam')
      return param ? JSON.parse(Base64.decode(param)) : undefined
    }
  }

  const getSafeArea: () => SafeArea = () => {
    if (typeof api !== 'undefined') {
      return window.api.safeArea
    } else {
      return { top: 0, left: 0, bottom: 0, right: 0 }
    }
  }

  const getWinSize: () => { winHeight: number; winWidth: number } = () => {
    if (typeof api !== 'undefined') {
      return {
        winHeight: window.api.winHeight,
        winWidth: window.api.winWidth,
      }
    }
    return {
      winHeight: window.screen.availHeight,
      winWidth: window.screen.availWidth,
    }
  }

  const setPullDownRefresh = (
    fn: (ret: any, err: any) => void,
    options: PullDownRefreshOptions
  ) => {
    if (typeof api !== 'undefined') {
      window.api.setRefreshHeaderInfo(
        Object.assign(
          {
            visible: true,
            loadingImg: 'widget://image/refresh.png',
            bgColor: '#282c34',
            textColor: '#fff',
            textDown: '下拉刷新...',
            textUp: '松开刷新...',
            showTime: true,
          },
          options
        ),
        (ret: any, err: any) => {
          fn && fn(ret, err)
        }
      )
    }
  }

  const openFrame = (params: FrameParams) => {
    let { url } = params
    url = url.endsWith('.html') ? url : isHttpUrl(url) ? url : url + '.html'
    if (typeof api !== 'undefined') {
      window.api.openFrame({ ...params, url })
    } else {
      const { name, rect, pageParam } = params
      const iframe = document.createElement('iframe')
      iframe.setAttribute('frameborder', '0')
      iframe.setAttribute('name', name)
      if (pageParam) {
        url = `${url}?pageParam=${Base64.encodeURI(JSON.stringify(pageParam))}`
      }
      iframe.src = url
      iframe.style.position = 'absolute'
      if (rect) {
        if (rect.x) {
          iframe.style.left = `${rect.x}px`
        }
        if (rect.y) {
          iframe.style.top = `${rect.y}px`
        }
        if (rect.w) {
          iframe.style.width = rect.w === 'auto' ? '100%' : `${rect.w}px`
        }
        if (rect.h) {
          iframe.style.height = rect.h === 'auto' ? '100%' : `${rect.h}px`
        }
      }
      document.body.appendChild(iframe)
    }
  }

  const toast = ({ msg, duration = 3000, location = 'bottom' }: ToastParam) => {
    if (typeof api !== 'undefined') {
      window.api.toast({ msg, duration, location })
      return
    }
    const vlocation =
      location === 'bottom'
        ? 'bottom: 10%;'
        : location === 'top'
        ? 'top: 10%;'
        : 'top: 50%;'
    const toastElement = document.createElement('div')
    toastElement.innerHTML = msg
    toastElement.style.cssText = `
     ${vlocation};
      max-width:60%;
      min-width:150px;
      padding:0 14px;
      height: 40px;
      color: rgb(255, 255, 255);
      line-height: 40px;
      text-align: center;
      border-radius: 4px;
      position: fixed;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      background: rgba(0, 0, 0, 0.75);
      font-size: 16px;
    `
    document.body.appendChild(toastElement)
    setTimeout(() => {
      const delay = 0.5
      toastElement.style.webkitTransition = `-webkit-transform ${delay}s ease-in, opacity ${delay}s ease-in`
      toastElement.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(toastElement)
      }, delay * 1000)
    }, duration)
  }

  const randomColor = (opts?: {
    rgb?: boolean;
    opacity?: number | 'random';
  }) => {
    const { rgb = false, opacity = 1 } = opts || {}
    const a =
      opacity === 'random'
        ? Number(Math.random().toFixed(3))
        : opacity > 1 || opacity < 0
        ? 1
        : opacity
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    let color = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`
    if (rgb) {
      color = a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`
    }
    return color
  }

  const isLightColor = (color?: string) => {
    let colorR = 255
    let colorG = 255
    let colorB = 255
    if (color && color.includes('#')) {
      color = color.substring(1)
      color = color.length === 3 ? color + color : color
      colorR = parseInt(color[0] + color[1], 16)
      colorG = parseInt(color[2] + color[3], 16)
      colorG = parseInt(color[4] + color[5], 16)
    }

    if (color && color.includes('rgb')) {
      const colors = color
        .replace(/rgb[a]?\(([\w\W]+)\)/, ($0, $1) => $1)
        .split(',')
      colorR = parseInt(colors[0])
      colorG = parseInt(colors[1])
      colorB = parseInt(colors[2])
    }

    return 0.213 * colorR + 0.715 * colorG + 0.072 * colorB > 255 / 2
  }
  
  const setStatusBarStyle = (statusBar: StatusBar) => {
    if (typeof statusBar === 'string') {
      window.api.setStatusBarStyle({
        color: statusBar,
        style: isLightColor(statusBar) ? 'dark' : 'light',
      })
    }
    if (typeof statusBar === 'object' && statusBar.color) {
      window.api.setStatusBarStyle({
        color: statusBar.color,
        style: statusBar.style
          ? statusBar.style
          : isLightColor(statusBar.color)
          ? 'dark'
          : 'light',
        animated: !!statusBar.animated,
      })
    }
  }

  return {
    page: { open, push, replace, close, closeToWin, pageParam },
    frame: { open: openFrame },
    pagesInfo: Object.keys(getPageMap()).map((k) => ({ ...getPageMap()[k] })),
    toast,
    getPageMap,
    getQueryString,
    bindKeyBackExitApp,
    n2p,
    getSafeArea,
    getWinSize,
    setPullDownRefresh,
    randomColor,
    isLightColor,
    setStatusBarStyle,
  }
}