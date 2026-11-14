import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  private hasPermission: boolean = false;
  private notificationsEnabled: boolean = true;

  constructor() {
    this.notificationsEnabled = localStorage.getItem('atlas_notifications_enabled') !== 'false';
    this.init();
  }

  public async init() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display === 'granted') {
        this.hasPermission = true;
      } else {
        const req = await LocalNotifications.requestPermissions();
        this.hasPermission = req.display === 'granted';
      }

      // Create high-importance Android Notification Channel
      await LocalNotifications.createChannel({
        id: 'atlas_matchday_channel',
        name: 'ATLAS Matchday Live',
        description: 'Instant goal announcements, captain alerts, and deadline reminders',
        importance: 5,
        visibility: 1,
        vibration: false,
      }).catch(() => {});
    } catch (e) {
      console.warn('LocalNotifications init error:', e);
    }
  }

  public isEnabled(): boolean {
    return this.notificationsEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled;
    localStorage.setItem('atlas_notifications_enabled', enabled ? 'true' : 'false');
  }

  /**
   * Schedule the 1-hour pre-deadline alert
   */
  public async scheduleDeadlineAlert(upcomingGwId: number, deadlineIso: string) {
    if (!this.notificationsEnabled || !Capacitor.isNativePlatform() || !deadlineIso) return;

    try {
      const deadlineDate = new Date(deadlineIso);
      const oneHourBefore = new Date(deadlineDate.getTime() - 60 * 60 * 1000);
      const now = new Date();

      if (oneHourBefore.getTime() <= now.getTime()) {
        return; // Deadline is less than 1 hour away or already passed
      }

      const notifId = 1000 + upcomingGwId;

      // Cancel existing reminder for this GW if already scheduled
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: `⏱️ Gameweek ${upcomingGwId} Deadline Alert!`,
            body: '1 hour remaining until deadline! Finalize your starting XI, transfer targets, and captain picks.',
            schedule: { at: oneHourBefore },
            channelId: 'atlas_matchday_channel',
            smallIcon: 'ic_launcher_foreground',
          },
        ],
      });
      console.log(`[NotificationService] Scheduled GW ${upcomingGwId} deadline alert for ${oneHourBefore.toLocaleTimeString()}`);
    } catch (e) {
      console.warn('Failed to schedule deadline alert:', e);
    }
  }

  /**
   * Trigger an instant notification with ZERO delay (direct to NotificationManager)
   */
  public async sendInstantAlert(title: string, body: string, idOffset?: number) {
    if (!this.notificationsEnabled || !Capacitor.isNativePlatform()) return;

    try {
      const id = (idOffset || Math.floor(Math.random() * 10000)) + 2000;
      // Omitting schedule delivers the notification immediately in <10ms without AlarmManager delay
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: 'atlas_matchday_channel',
            smallIcon: 'ic_launcher_foreground',
          },
        ],
      });
    } catch (e) {
      console.warn('Failed to send instant notification:', e);
    }
  }
}

export const notificationService = new NotificationService();
