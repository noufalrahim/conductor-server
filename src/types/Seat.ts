export type Seat = {
  Agent: number
  BaseFare: number
  BkgType: string
  BusTypeID: number
  BusTypeName: string
  ColumnNo: number
  CompanyChartID: number
  CompanyChartName: string
  Deck: number
  Fare: number
  Gender: string
  IsAC: boolean
  IsAisle: boolean
  IsAvailable: number
  RouteCode: string
  RowNo: number
  SeatLabel: string
  SeatTypeID: number
}

export interface SeatApiResponse {
  APIGetChartMicrositeResult: {
    ErrorMessage: string
    Status: boolean
    Seats: Seat[]
  }
}
