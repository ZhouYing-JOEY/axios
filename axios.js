import Axios from "axios";

const typeOf = (obj, type) =>
  Object.prototype.toString.call(obj) === `[object ${type}]`;
const isEmpty = (obj) =>
  [Object, Array].includes((obj || {}).constructor) &&
  !Object.entries(obj || {}).length;
const forEach = (obj, callback) => {
  if (Array.isArray(obj)) {
    obj.forEach(callback);
  }
  if (typeOf(obj, "object")) {
    Object.entries(obj).forEach(([k, v]) => callback(v, k));
  }
};

const METHOD = {
  GET: "get",
  POST: "post",
};

class Remote {
  constructor() {
    this.axios = Axios.create({
      timeout: 2000,
      baseUrl: "http://localhost",
    });
    this.interceptors();
    this.requestList = [];
    this.CancelToken = Axios.CancelToken;
  }

  stopRequest = (url, cancel) => {
    if (this.requestList.includes(url)) {
      cancel();
    } else {
      this.requestList.push(url);
    }
  };

  allowRequest = (url) => {
    const index = this.requestList.indexOf(url);
    this.requestList.splice(index, 1);
  };

  interceptorsRequest = () => {
    this.axios.interceptors.request.use(
      (config) => {
        let cancel;
        config.cancelToken = new this.CancelToken(function (c) {
          cancel = c;
        });
        stopRequest(config.url, cancel);
        return config;
      },
      (error) => Promise.reject(error)
    );
  };

  interceptorsResponse = () => {
    this.axios.interceptors.response.use(
      (response) => {
        allowRequest(response.config.url);
        return response;
      },
      (error) => {
        if (!axios.isCancel(error)) {
          allowRequest(error.config.url);
        }else{
            Promise.reject(error);
        }
      }
    );
  };

  genConfig = (method, url, data, type = "json", ...specificConf) => {
    const sendUrl = url;
    const config = {
      method,
      url,
      data,
      type,
      withCredentials: true,
      ...specificConf,
    };
    if (method === METHOD.GET) {
      sendUrl += THIS.genQuery(data);
      config.url = sendUrl;
    } else {
      let contentType = "";
      let cfgData = {};
      switch (type) {
        case "json":
          contentType = "application/json";
          cfgData = JSON.stringify(data || {});
          break;
        case "file":
          contentType = "multipart/form-data";
          cfgData = new FormData();
          forEach(data, (val, key) => {
            cfgData.append(key, val);
          });
          break;
        case "formData":
          contentType = "application/x-www-form-urlencoded";
          config.transformRequest = [
            (requestData) => {
              let ret = "";
              let index = 0;
              forEach(requestData, (v, k) => {
                ret += `${index === 0 ? "" : "&"}${encodeURIComponent(
                  k
                )}=${encodeURIComponent(v)}`;
                index += 1;
              });
              return ret;
            },
          ];
          break;
        default:
          break;
      }
      config.headers = { "Content-Type": contentType };
      config.data = cfgData;
    }
    return config;
  };

  request = (method, url, ...config) => {
    if (!url) return null;
    const config = genConfig(method, url, ...config);
    return new Promise((resolve, reject) => {
      this.axios
        .request(config)
        .then((resp) => {
          const respData = resp.data;
          const code = respData?.code;
          switch (+code) {
            case "200":
            case 200:
              resolve(respData);
              break;
            case 401:
              window.location.href = "redirect";
              break;
            default:
              reject({
                error: -1,
                code: respData?.code,
                message: respData?.message,
                data: respData?.data,
              });
          }
        })
        .catch((error) => reject(error));
    });
  };

  get = (url, data, ...options) => {
    return new Promise((resolve, reject) => {
      return this.request(
        METHOD.GET,
        `${baseUrl}${url}`,
        data,
        "json",
        ...options
      ).then(
        (res) => {
          resolve(res);
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  post = (url, data, ...options) => {
    return new Promise((resolve, reject) => {
      return this.request(
        METHOD.POST,
        `${baseUrl}${url}`,
        data,
        ...options
      ).then(
        (res) => {
          resolve(res);
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  genQuery = (data) => {
    if (isEmpty(data)) return "";
    let ret = "";
    forEach(data, (val, key) => {
      if (typeof val !== "undefined") {
        ret += `&${key}=${encodeURIComponent(val)}`;
      }
    });
    return ret.replace(/&/, "?");
  };
}

const remote = new Remote();
export default {
  get: remote.get,
  post: remote.post,
};
