export type RouteConfig = {
  label: string
  fromCityID: number
  toCityID: number
  fromCityName: string
  toCityName: string
  enabled?: boolean
}

export type AppConfig = {
  timings: string[]
  routes: RouteConfig[]
  emails: string[]
  nightStartHour: number
}
